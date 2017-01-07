/**
 * Created by Iaroslav Zhbankov on 07.01.2017.
 */
$('.reload').each(function(index){
    $(this).on('click', function(){
        window.reload();
    })
});